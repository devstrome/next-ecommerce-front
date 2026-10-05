'use client'
import React from 'react';
import { FaEdit, FaTrash, FaUserShield, FaUserCog, FaEye, FaBan } from 'react-icons/fa';

const AdminList = ({ admins, onEdit, onDelete, onBan, currentAdminId }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3">
              Admin
            </th>
            <th scope="col" className="px-6 py-3">
              Username
            </th>
            <th scope="col" className="px-6 py-3">
              Email
            </th>
            <th scope="col" className="px-6 py-3">
              Role
            </th>
            <th scope="col" className="px-6 py-3">
              Created
            </th>
            <th scope="col" className="px-6 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {admins.length > 0 ? (
            admins.map((admin) => {
              const isCurrentUser = admin._id === currentAdminId;
              return (
                <tr
                  key={admin._id}
                  className={`bg-white border-b hover:bg-gray-50 transition-colors ${
                    isCurrentUser ? 'bg-maybelline-light' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={admin.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.firstName + ' ' + admin.lastName)}`}
                        alt={`${admin.firstName} ${admin.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {admin.firstName} {admin.lastName}
                          {isCurrentUser && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-maybelline-light text-maybelline-magenta">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {admin.userName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={`mailto:${admin.email}`}
                      className="text-maybelline-pink hover:text-maybelline-magenta hover:underline"
                    >
                      {admin.email}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {admin.superAdmin ? (
                        <>
                          <FaUserShield className="text-red-500" />
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Super Admin
                          </span>
                        </>
                      ) : (
                        <>
                          <FaUserCog className="text-maybelline-pink" />
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-maybelline-light text-maybelline-magenta">
                            Admin
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(admin.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEdit(admin)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-maybelline-pink bg-maybelline-light rounded-lg hover:bg-maybelline-light transition-colors"
                        title="Edit Admin"
                      >
                        <FaEdit className="text-xs" />
                        <span>Edit</span>
                      </button>
                      {isCurrentUser ? (
                        <button
                          disabled
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                          title="You cannot delete your own account"
                        >
                          <FaBan className="text-xs" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onDelete(admin._id)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          title="Delete Admin"
                        >
                          <FaTrash className="text-xs" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr className="bg-white border-b">
              <td
                colSpan="6"
                className="px-6 py-8 text-center text-gray-500"
              >
                <div className="flex flex-col items-center space-y-2">
                  <FaUserCog className="text-4xl text-gray-300" />
                  <p className="text-lg font-medium">No admins found</p>
                  <p className="text-sm">Start by adding your first admin account</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminList;